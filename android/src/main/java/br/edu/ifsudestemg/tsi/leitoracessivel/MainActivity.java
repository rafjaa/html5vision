package br.edu.ifsudestemg.tsi.leitoracessivel;

import android.content.Intent;
import android.net.Uri;
import android.support.v7.app.ActionBarActivity;
import android.os.Bundle;

public class MainActivity extends ActionBarActivity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        Intent i = new Intent(Intent.ACTION_VIEW, Uri.parse("https://rafjaa.github.io/html5vision/"));
        startActivity(i);
    }
}
